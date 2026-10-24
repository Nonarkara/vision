# AGENTS.md

> **Read [ANTI-SLOP.md](ANTI-SLOP.md) before any design or frontend work.** These are Dr Non's hard rules against AI design slop: empty space is a decision, subtract before you add, and the map comes first. Check pages with `slop-lint` (tools/slop-lint.mjs in Nonarkara/palette).
>
> **Read [MSH.md](MSH.md) before any design or frontend work.** Spatial hallucination (SH) is the root cause: an interface that invents a reason for things to occupy space instead of arranging them around how people read, choose and act. It is not cosmetic polish and it is not slop — a system can work and still be **bad design** because its geometry makes a small task expensive. The giant top bar, the stretched row, the equal cards that make a page monotonous, and the long scroll that follows are all the same failure. **When you find SH, massacre.**

This file is the entry point for AI agents (Grok Bot, Claude, Cursor, ChatGPT, Copilot) working in this repo. Read the README for what the project is. Follow ANTI-SLOP.md for every screen.

## MSH — spatial hallucination is the root cause

`ANTI-SLOP.md` lists thirteen hard limits. They are the **symptoms**. SH is the **disease**: one element expands without a task reason, its row or header grows to accommodate it, useful content falls below the first screen, related things lose their shared context, and the user scrolls to reconstruct a picture the layout should have given them. A page can pass all thirteen limits and still be spatially hallucinated, and it can fail one limit and be fine everywhere else.

The law is in [MSH.md](MSH.md) and it is not optional:

1. **The test, for every region:** *Why is this here? Why this size? Why this far from that?* "The grid put it there", "the container had room" and "it looks balanced" are failed answers.
2. **Fix the first unnecessary expansion.** Do not decorate its consequences, and do not solve SH by adding another spacer, panel, badge or row of identical cards.
3. **Compose the first screen before extending the page.** 390 × 844, 1024, and 1440 × 900. If the task can fit one screen, make it fit; if the content earns the scroll, organise that scroll around meaning.
4. **Relationships determine distance.** Related controls stay together, labels stay with their values, explanations stay with the decision they support. Less space within a group than between groups.
5. **Chrome earns its pixels.** Headers, nav, toolbars and sticky bands fit their useful contents. Do not stack identity, title, status and controls into separate bands when they are one coherent group. Measure the combined footprint, gaps and sticky offsets included.
6. **Evidence before a pass.** Real screenshots at 390, 1024 and 1440; chrome cost, task visibility, geometry failures, hierarchy and preservation recorded per viewport. Source scans and green builds cannot prove a visual pass. If rendering was unavailable, report **unverified**.

The completion report for visual work states: **Found** (element, viewport, task cost) · **Changed** (the invented spatial demand removed) · **Verified** (screenshots, measured before/after, exercised interactions, independent review) · **Remaining** (unresolved SH or unverified states — never claim a clean pass while any remain).

## Reading the linter's hits

`slop-lint` scores heuristics, not the house. Four hits fire here for reasons that have nothing to do with the design, and one of them fires on nine of the fifteen rooms. Read a hit against this baseline, not by its name:

- **`default-font`** — the linter's banned list contains `ibm plex sans thai`, the house's own approved Thai face. It always fires.
- **`emoji-icons`** — the house's `↗` and `▶` marks are Unicode Extended_Pictographic and the linter has no functional-symbol exclusion.
- **`type-chaos`** — the Thai face is set at 0.82em of its Latin counterpart, so a bilingual page computes more sizes than the eight-step scale.
- **`void`** — the rule measures the largest connected flat region, which on this site is the paper ground that wraps a room's floating cards. Measured on one tree: /everyday 0.737, /colour 0.712, /reconstruct 0.565, /games 0.551, /gesture 0.522, /research 0.530, /system 0.530, /handbook 0.510, /drive 0.416, /train 0.383.

The number is not the finding. Locate the region and look at it before calling it dead space: a hit on the paper ground is the house's ground, and a hit on the head of a page is a void a person can see.

## The colour law — three hues on a screen

The site has four hues and admits no others. Each has exactly one job, and the job is written down with the colours themselves in `public/js/core/palette.js`:

| hue | job | where it belongs |
|---|---|---|
| **ivory** `#ebd3a2` | the paper | the ground a room sits on, and the type on a dark ground |
| **indigo** `#051230` | the words | the ink a person wrote, and the dark ground its type stands on |
| **gray** `#b6bfc1` | the quiet | the parts nobody is meant to read first — an instrument's frame, a step number, a specimen's mount |
| **jasper** `#eb5324` | the signal | what the machine sees, and only that |

**Every room's first screen carries at least three of the four, each at a size a reader can see — `SCREEN_FLOOR`, half a per cent of the screen — and each doing its own job.** A screen carrying two reads as two colours however well it is laid out. That is what "dull" means here: not beige, not empty, but the same two colours twice. Measured before 1.23.0, gray and jasper were under half a per cent of a first screen on most rooms, and the instrument's frame was black — 1.03:1 from the indigo, the same colour twice.

**A photograph's colours are the world's, not the house's.** On a room that leads with a photograph, the house is measured on what it *paints*: an opaque surface by its own pixels, and a scrim over a photograph by its declared colour and its own area. The story's veil was the hardware's black, which is not one of the four hues and credits nothing; it is the site's ink now, and the loudest page reads as the house's own paper on the house's own ground.

The census is a browser instrument, so it lives with the other browser instruments and is run by hand before a release, the way `slop-lint` is:

```sh
cd ../_shared/vision-tools && BASE=http://127.0.0.1:8431 node hue-share.mjs
```

It prints, per room and per width, which hues are carried and how much of the screen each one takes. **The repository holds the declarations themselves**: `tests/colour-law.test.js` pins them, and every pin there was proved by injection — the declaration was changed, the pin failed, the declaration was put back.

When a room fails:

- **It carries two hues** — find the quiet surface it is missing. The quiet hue belongs on the instrument's picture frame, on the machine's state and counters, on step numbers, on a specimen's mount. Never a hairline, never a 12px muted label, and never a full-width bar — a quiet field on a row that spans the screen is a stretched bar, and the linter says so.
- **A hue is there but has no job** — that is worse than a missing hue. Gray that decorates has stopped being the quiet.
- **The signal hue is missing** — it is not owed on every screen. It belongs where the machine has answered: the recording light, the mark on a detected object, the step the machine confirmed. A room where the machine has not spoken yet does not owe a signal.
- **A pairing is new** — certify it. `scripts/palette-measure.mjs --check` is the gate, and a pairing the site really paints but the certificate does not know is a pairing nobody has measured.

## Shipping a release

1. `npm run check` must be green before anything is published: fonts, the generated handbook, the test suite, site references, module URL consistency, privacy, docs and the palette certificate.
2. `npm run deploy` runs that gate itself, backs up the previous runtime, restarts the launchd app, and verifies health.
3. **Write the release into `ops/AWAY-STATUS.md`** — one `###` entry per release, with the version and the date. The per-pass detail lives in `ops/*.md`; the log is the running record, and it is the file a person reads to know what shipped. It has fallen five releases behind before, because nothing forced the write.
4. Write that entry from **measurements taken on the release tree**, not from memory: check the release out in a `git worktree` and count its tests, its references and its linter numbers there. Numbers carried over from an earlier release are how a log starts lying.
5. Verify the public site afterwards: `/api/health` returns `ok:true` with the new version, the served HTML carries the new `?v=` stamps, and the pages you changed open without a console error or a horizontal overflow.
6. **A module that changed must be fetched under a new URL.** The server sends `no-cache`, but the edge in front of it rewrites that to a four-hour `max-age`, so a browser that already holds the old response treats it as fresh — the `?v=` stamp on the import is the only thing that stops a stale copy. HTML references carry `{{v}}`, rendered per request, so they need nothing; **a module imported by another module has to have its stamp moved by hand**, and that is exactly what gets forgotten. `npm run deploy` now refuses to publish a changed module that is still imported under its old stamp (`scripts/check-module-stamps.mjs`), so this fails closed rather than shipping a four-hour-old module.
