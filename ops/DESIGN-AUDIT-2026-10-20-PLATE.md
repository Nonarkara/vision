# DESIGN AUDIT — the new plate, and the slop pass that came with it

**20 October 2026 · release 1.19.0 · after 1.18.0**

Two instructions came together: change the colour pairing — the house ritual that
happens on every massive upgrade — and massacre AI design slop. This is what the
pass measured, what it changed, and what it deliberately left alone.

---

## 1. The new plate

The old plate was four hues from Sanzo Wada's Plate 303: Naples Yellow (paper),
Deep Slate Olive (ink), Neutral Gray (structure), Peach Red (signal). The new one
is four hues from the same archive, chosen by measurement rather than by taste
alone:

| role | old | new | |
|---|---|---|---|
| paper | Naples Yellow `#fbe6a0` | **Ivory Buff** `#ebd3a2` | the room: ~62% of any view |
| ink | Deep Slate Olive `#253122` | **Deep Indigo** `#051230` | the words, and the ground of every instrument |
| structure | Neutral Gray `#b6bfc1` | **Neutral Gray** `#b6bfc1` | what the machine is unsure of |
| signal | Peach Red `#f15a30` | **Jasper Red** `#eb5324` | only ever what the machine sees |

**Why these.** The paper stays warm. A cold, corporate plate is the exact thing
`ANTI-SLOP.md` is arguing against, and the house's own argument is that this is a
classroom, not a product. The *ink* is what changed: the old olive was a
near-black green that read as "dark", not as anything. Deep Indigo reads as
instrument — a cold readout against warm paper — which is the argument the site
makes in colour instead of only in a caption under it. Jasper Red is a truer alarm
than Peach Red: the old name was a fruit.

**How they were found.** The house's own credited archive (`Nonarkara/palette`,
159 hues, each tagged with the printed plates it appears in) was searched for
quadruples that satisfy the site contract. 73,024 quadruples clear it; seven sit
on a single printed plate; the strongest of those are muddy or wrong-role — a
cyan "quiet", a green "signal", a paper that shouts. So the four hues were chosen
by eye and then *proved*, rather than chosen by a score.

**The contract, proved.** `npm run palette` measures the ladder and every pairing
from `public/js/core/palette.js` — the one definition the gate and the browser
both read:

- 16 required pairings clear their floor (text 4.5:1, large 3:1, mark 3:1).
- 5 forbidden pairings stay *below* their floor, so a ban is proved rather than
  asserted. `black on indigo` is 1.03:1. `indigo.pale on ivory` is 1.11:1.
  `jasper on ivory` is 2.48:1 — base signal is still marks-only on paper.
  `white on jasper` is 3.32:1.
- The unlock still works: `jasper.deep` on ivory is 11.30:1, so emphasis set in
  signal on the paper ground is legal — same hue, same job, one step down.
- The colour study still deals 24 ways and still refuses the same six: 18
  legible, 6 behind the explicit toggle, and all six are plates where Jasper Red
  is the paper, because no hue reaches 4.5:1 on it at any tone.

**Provenance.** The four hues no longer share one printed plate, so the citation
changed: the footer, `/system`'s credits, the handbook and the README now say
*four hues from Sanzo Wada's archive* and link to the catalogue, not to a plate
number. No plate number was invented.

---

## 2. What the rename touched, and why it was not cosmetic

Renaming the hues was not a find-and-replace. Four hues are load-bearing in
places that do not look like colour:

- **The tone ladder.** `deep = 24% hue + 76% black`, `pale = 22% hue + 78% white`.
  The code was always right; the *comment* in `palette.js:10` and in
  `vision.css:15-16` had the percentages the wrong way round, in both files, for
  as long as they existed. Fixed here.
- **The colour study's plate ids.** They are built from the hue keys, so
  `signal-olive-gray-naples` became `jasper-indigo-gray-ivory`. The live study
  had answered zero questions, so nothing was orphaned; a study that had answered
  questions about the *old* colours would have had to start again, because the
  answers were about different colours.
- **The study's special case.** `/colour` explains, in both languages, why one
  hue is refused as paper — but the branch was keyed off the literal string
  `'signal'`. After the rename it would never have fired again, and the page's
  best sentence would have quietly become a generic one. It now reads
  `HOUSE.signal`, so the sentence and the palette cannot drift apart.
- **The names in the prose.** Every hue name the page prints now comes from the
  one `HUE` map, so "Jasper Red" is spelled one way on every surface.

---

## 3. Three latent defects the rename exposed

These were already broken; the rename is what made them visible.

1. **`fill-olive` was never a rule.** `/reconstruct`'s diagram used
   `class="fill-olive"` for its three camera blocks, and no such CSS rule
   existed — they were rendering with the SVG default fill, black, not the ink
   hue they were asking for. There is now a `.fill-indigo` rule and the markup
   asks for it.
2. **`stroke-signal` was never a rule either.** Four detection marks in the
   home and Drive diagrams (`stroke-signal`) had no rule, so the machine's
   findings were stroked in black rather than in the signal hue. The whole
   swatch set is now named after the hues it paints: `fill-ivory`,
   `fill-indigo`, `fill-gray`, `fill-jasper`, `fill-black`, `stroke-jasper`,
   `stroke-gray`. A check now compares the classes used in the markup against
   the rules that exist.
3. **`/drive`'s legend described colours the room no longer paints.** It said
   "yellow = hasty" and "olive blocks = buildings" while the room painted ivory
   and indigo. The legend now names what is on screen, in Thai and English.

---

## 4. The slop pass: the house measure was over its own ceiling

`ANTI-SLOP.md` rule 2 is "≤65ch for prose" and calls lines too long to read the
**second** most common slop pattern in the 46-app study — 64% of slop apps went
over 40em, median 61em against 26em for the clean ones.

The 1.18.0 pass had fixed the *prose* class but nobody had checked the other
rules. Ten of them sat above the house's own ceiling:

    figcaption 70ch · .note 70ch · .machine-line/.gloss-line/.illegal-warn 68ch
    .consent 68ch · .wall-note 70ch · .drill-head 68ch · .room-head 70ch
    .captcha 70ch · .limits 74ch · .census-caveat 80ch (a dead rule)

Every one of them is now 62ch — the house's canonical number, the one `.prose`
and the timeline already use. `tests/measure.test.js` now fails the build if any
`max-width: Nch` in the stylesheets goes over 65ch, and if the measure stops
sitting on the text rather than on a container around it. The test was
mutation-checked: a 90ch rule makes it fail, and removing it makes it pass.

Measured after the fix, across fifteen routes: the widest *prose* line on the
site is 39em, down from 41.8em. What remains above 40em is not prose — it is the
wide table wrappers on `/system` and `/cameras`, the SVG diagram labels, and the
horizontal diagram scroller on `/learn`. Those are the same three the linter
already reports and the house already documents as deliberate.

---

## 5. The instrument, and what it says

`slop-lint` was run over all twenty-seven routes before the change (against
production, so the comparison is like for like) and after:

    production 1.18.0, old plate : 69 points · 12 REVIEW · 15 OK · 0 SLOP
    this tree, new plate + measure: 69 points · 12 REVIEW · 15 OK · 0 SLOP

**No route's hit list differs.** The palette change introduced no new signal
anywhere, and the measure fix removed the one route that had drifted past the
house rule (`/reconstruct`, which had picked up a `long-lines` hit because a
Thai caption line reached 41.8em).

Hits read, and deliberately left alone, with reasons:

- `emoji-icons` — the house's `↗` and `▶` marks. They are Unicode
  Extended_Pictographic and the linter has no functional-symbol exclusion. They
  are the house's marks, not emoji used as icons. (Rule 5 is still a rule; this
  is the linter's blind spot, not a licence.)
- `default-font` — the linter reads the fallback stack. The site ships IBM Plex
  Sans, IBM Plex Sans Thai and IBM Plex Mono, and the linter's own banned list
  contains `ibm plex sans thai`, which is why it fires at all.
- `type-chaos` — the Thai face is set at 0.82em of its Latin counterpart, so a
  bilingual page computes more distinct sizes than a human would count. The
  eight-step scale is intact.
- `void` — a large flat paper ground. The ground is the room.
- `long-lines` — the wide table wrappers and the diagram columns, as above.

---

## 6. Independent review

A different agent, one that did not make these changes, reviewed all
eighty-one screenshots (twenty-seven routes at 1440, 1024 and 390) against the
rulebook, and looked for what the instrument cannot see: hierarchy, composition,
lazy ornaments, filler copy, boxes that do not fit their content, badges on every
line, the mobile fold, and anything the new plate broke. Its findings are
recorded in `ops/AWAY-STATUS.md` with the 1.19.0 entry.

The house rule is that no one reviews their own work.
