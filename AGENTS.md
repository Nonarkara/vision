# AGENTS.md

> **Read [ANTI-SLOP.md](ANTI-SLOP.md) before any design or frontend work.** These are Dr Non's hard rules against AI design slop: empty space is a decision, subtract before you add, and the map comes first. Check pages with `slop-lint` (tools/slop-lint.mjs in Nonarkara/palette).

This file is the entry point for AI agents (Grok Bot, Claude, Cursor, ChatGPT, Copilot) working in this repo. Read the README for what the project is. Follow ANTI-SLOP.md for every screen.

## Shipping a release

1. `npm run check` must be green before anything is published: fonts, the generated handbook, the test suite, site references, module URL consistency, privacy, docs and the palette certificate.
2. `npm run deploy` runs that gate itself, backs up the previous runtime, restarts the launchd app, and verifies health.
3. **Write the release into `ops/AWAY-STATUS.md`** — one `###` entry per release, with the version and the date. The per-pass detail lives in `ops/*.md`; the log is the running record, and it is the file a person reads to know what shipped. It has fallen five releases behind before, because nothing forced the write.
4. Write that entry from **measurements taken on the release tree**, not from memory: check the release out in a `git worktree` and count its tests, its references and its linter numbers there. Numbers carried over from an earlier release are how a log starts lying.
5. Verify the public site afterwards: `/api/health` returns `ok:true` with the new version, the served HTML carries the new `?v=` stamps, and the pages you changed open without a console error or a horizontal overflow.
