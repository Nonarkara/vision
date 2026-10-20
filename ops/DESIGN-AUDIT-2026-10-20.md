# Frontend design, claims and correctness audit · 20 October 2026

Release **1.18.0**. Scope: every one of the 27 routed pages screened with
`slop-lint`, a read of the shared stylesheet for the rules the linter cannot
see, and an independent read of the server and browser code for correctness,
privacy and truthfulness of claims. This is not a claim that every route or
every interaction is free of defects; it is a record of what was measured,
what was changed, and what was deliberately left alone.

## Why this pass exists

The 19 October audit screened six routes: Home, Cameras, Learn, Teach, Drive
and Research. It found and fixed real problems, and it said plainly that the
remaining findings needed context. What it could not do was tell us about the
other twenty-one rooms, because nobody had looked.

So this pass started by measuring everything. One page had never been audited
and was the worst on the site.

## Measurements

`slop-lint` at 1440×900 and 390×844, Thai locale (the site's default), local
build of 1.17.9. Points, not percentages: **≥6 is SLOP, 3–5 REVIEW, <3 OK.**

| Route | Before | After | What changed |
|---|---|---|---|
| `/focus` | **9 SLOP** | 5 REVIEW | idle panel explained, counter sized to its words, button sized to its label, off-scale sizes, prose measure |
| `/games` | 4 REVIEW | **2 OK** | counter no longer a digit alone in an 800px band; two mode buttons sized to their labels |
| `/gesture` | 3 REVIEW | **2 OK** | prose measure (63 characters a line → inside the measure) |
| every other 24 routes | 0–5 | 0–5 | unchanged by score; the measure fix removed over-wide lines from `/drive`, `/cameras`, `/system` and the handbook |

**No route is SLOP.** Total across all 27 routes: **76 → 69** points; routes at
SLOP: **1 → 0**; routes at OK: **11 → 13**.

Only three routes moved their score, and each moved because a rule was being
broken rather than because a number was being chased. The total moved by seven
because most remaining points are not slop. They are the linter's heuristics,
read one by one, below.

## Repairs

### The house measure was written and never enforced

`.prose { max-width: 62ch }` caps a line at 62 characters — but `ch` is
resolved against the **container's** font-size, not the text's. A 22px column
handing a 14px paragraph got 73 characters, and a 22px paragraph got 818px of
line. The rule was in the stylesheet and the pages were breaking it.

The cap now sits on the prose itself, so it is counted at the size the reader
sees. `/drive` was running 82 characters per line; `/gesture` 63; `/cameras`
66. All are now inside the measure.

### `/focus` had never been audited

- **The camera panel was a dead black half.** Every other room in the house
  wraps its canvas in `.bench-view` and puts a `.bench-state` line inside it.
  `/focus` was the only room that did not, so before permission it was a black
  rectangle with nothing in it — the largest empty region on the page. It now
  carries the house's own idle line, at the top of the panel where the eye
  already is, and it hides only while real frames are on the canvas.
- **Four readings in four equal tracks.** The session metrics were
  `repeat(4, minmax(0,1fr))` — a 360px track holding a 166px reading. They are
  now a ruled strip sized to their own words, like the catalogue facts strip.
- **A button the width of its column.** The recalibrate button was a grid item
  and grid items stretch; its label is four words. It is now the width of its
  label.
- **Two sizes that were not on the stated scale** (`1.4rem`, `1.8rem`). Now
  `--body` and `--lede`. In English the page now computes exactly the eight
  steps of the house scale and nothing else.

### `/games` had a digit alone in an empty band

The count control was a three-track grid whose middle track was a whole column
wide, so the single digit `0` sat in 819px of nothing. It is now a counter:
minus, number, plus, taking the width of its own content. The two mode
buttons beside it were sharing the row in half each (507px for a 96px label);
they are now the width of their labels.

## Claims that were not true

These came from an independent read of the code, not from the linter.

**A visitor could be shown a plate the machine refuses.** `/colour` says the six
plates the machine cannot read are reachable only behind an explicit button.
The shared roll that lands on a visitor's screen on arrival was rolling from
all twenty-four — so roughly one visit in four put an unreadable plate in
front of someone who never asked for one. The route now rolls from the legible
pool. `tests/colour.test.js` rolls it eighteen times through the real handler.

**A camera probe waited four times as long as it said.** The probe passed
`videoTimeout: 8000`; the code that read it called the option `timeout`. The
option was dead, so every cold open waited the 20-second default — about
forty seconds for two batches of probes. Both ends now say `videoTimeout`, and
`tests/camera-timeout.test.js` fails if they drift apart again.

**`/legal` understated what the site stores.** The page said the site keeps two
things in your browser. It keeps nine. The paragraph now names all nine, and
`scripts/check-privacy.mjs` fails the build if a key exists in the code and is
missing from that sentence — and if the sentence's count no longer matches the
code. The page is where a PDPA question would be answered from; it should not
be able to drift away from the truth.

**Two photographs carried GPS.** The published web copies were clean. The
full-resolution originals in `public/CCTV photos/` — tracked in a public
repository — still had the coordinates of the control rooms in them, which is
exactly what the author had stripped from the copies. Both now carry no
location metadata, and all twelve tracked images are verified clean.

## Findings read and left alone

These are real hits on the linter that a person read and did not act on.

- **`emoji-icons` (2 points, on four routes).** The house's external-link mark
  `↗` and its play mark `▶` are in Unicode's Extended_Pictographic set, so the
  linter counts them as emoji used as icons. They are functional typographic
  marks used deliberately across the site, and the 19 October audit reached the
  same conclusion. Stripping them would make external links less clear.
- **`type-chaos` (1 point, on eight routes).** The linter counts the sizes the
  page computes in **Thai**, where the Thai face is set at 0.82em of its Latin
  counterpart because Thai marks sit above and below the line. That optical
  step is three extra sizes on a bilingual page and is a deliberate decision,
  documented in the stylesheet. The genuinely off-scale sizes — bespoke
  `clamp()` values that were not on the stated scale — have been removed.
- **`void` (2 points, on seventeen routes).** The largest flat region on a
  light-background site is the background itself; it is reported at 35% of the
  first screen. On `/focus` it was measured and traced: the region is the
  Naples background around a display-size heading, not the camera panel.
  Raising the camera's share of the first screen to the 40% the map-first rule
  asks for would mean moving the panel above the heading, which the house's
  own rule ("h1 is the page") forbids and which would push the consent and
  the start button further from the camera.
- **`big-number-tiles` on `/cameras` (1 point).** The catalogue strip is
  content-width and number-led, and the number *is* the data on that page. The
  19 October audit repaired it deliberately.
- **`stretch-to-fill` on the four-step path (1 point on two routes).** The path
  is a navigation band of four equal columns, and it was reviewed and kept on
  19 October. Making the columns content-width would leave a mostly empty band.
- **`long-lines` on tables and diagram columns (1 point).** The remaining hits
  are `.table-wrap` scroll containers and grid columns holding an SVG
  diagram. They are wide because tables are wide, not because prose is.

## One thing for the author to decide

The full-resolution IOC photographs are still tracked in a public repository.
They are now free of location metadata, and the site has always published
reduced copies of the same pictures, so nothing is newly disclosed. But the
originals remain in the repository's history, where removing them would need a
`git filter-repo` rewrite — a destructive, public, irreversible act that
rewrites every clone. That is the author's call, not this pass's.

## Gate

`npm run check` on the release tree: **308 tests, 308 pass, 0 fail** (305
before this pass; three new). 27 pages, 93 local references, all JS parses,
all model shards present. Fonts, handbook, forked imports, privacy, docs and
palette checks all green.

Screenshots were taken at 1440×900 and 390×844 and read by an agent that did
not make the changes, because the house rule is that no one reviews their own
work. That review found five things this pass had got wrong, and all five are
fixed here:

- **The `/games` counter was broken.** The counter group has four children —
  minus, the number, plus, and the button that finishes the count. The repair
  declared three grid tracks, so the fourth button wrapped onto a second row
  and was crushed into the 44px track that had been built for a different
  thing: 44×77px with its label folded over two lines. All four tracks are
  declared now, and the group is one row of 237×64px.
- **The `/focus` camera could be squashed.** The repair set
  `object-fit: fill` on the canvas. The house's enlarged-panel rule drops the
  aspect ratio so a 16:9 panel can fill the screen, and a 4:3 camera picture
  stretched into that box is a picture of a face in the wrong proportions —
  and the page's whole subject is where the landmarks are. The override is
  gone; the house's `contain` is identical in the normal 4:3 box and correct
  in an enlarged one.
- A comment in `games.css` claimed that every other controls row in the house
  sizes its buttons to their words. It is not true — `/train`, `/gesture` and
  `/cameras` all still fill their bars. The comment now says what is actually
  true: the house is not uniform, and a button stretched to five times its
  words is not a choice anybody made.
- The new idle line on `/focus` repeated two things the page already said —
  "camera off" and "the picture never leaves this device". It now labels the
  region instead: *the camera picture will appear here* — and it is hidden
  when the session is over and no picture is coming.
- The research timeline was separately capped at 72 characters, which broke
  the same rule the rest of this pass fixed. It is 62 now.

The reviewer also confirmed that the 62-character cap is a real improvement
and not just a different number: prose on `/focus` was running at 74 and 76
characters, `/drive` at 96, and `/gesture` at 89. All are inside the house
measure now, the cap only ever narrows, and it is inert at 390px. It found no
broken layout, no clipped text and no phone overflow in any of the changed
screens — other than the two above, which it caught.

## What this pass does not claim

That every route is free of defects. That the linter's remaining points are
all false positives — four of them were left in place after being read, and
that reading is above. That the photographs in the repository's history are
gone. That the site's behaviour was tested beyond the routes a linter can
load.
