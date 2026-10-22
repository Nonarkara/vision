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

## Shipping a release

1. `npm run check` must be green before anything is published: fonts, the generated handbook, the test suite, site references, module URL consistency, privacy, docs and the palette certificate.
2. `npm run deploy` runs that gate itself, backs up the previous runtime, restarts the launchd app, and verifies health.
3. **Write the release into `ops/AWAY-STATUS.md`** — one `###` entry per release, with the version and the date. The per-pass detail lives in `ops/*.md`; the log is the running record, and it is the file a person reads to know what shipped. It has fallen five releases behind before, because nothing forced the write.
4. Write that entry from **measurements taken on the release tree**, not from memory: check the release out in a `git worktree` and count its tests, its references and its linter numbers there. Numbers carried over from an earlier release are how a log starts lying.
5. Verify the public site afterwards: `/api/health` returns `ok:true` with the new version, the served HTML carries the new `?v=` stamps, and the pages you changed open without a console error or a horizontal overflow.
6. **A module that changed must be fetched under a new URL.** The server sends `no-cache`, but the edge in front of it rewrites that to a four-hour `max-age`, so a browser that already holds the old response treats it as fresh — the `?v=` stamp on the import is the only thing that stops a stale copy. HTML references carry `{{v}}`, rendered per request, so they need nothing; **a module imported by another module has to have its stamp moved by hand**, and that is exactly what gets forgotten. `npm run deploy` now refuses to publish a changed module that is still imported under its old stamp (`scripts/check-module-stamps.mjs`), so this fails closed rather than shipping a four-hour-old module.
