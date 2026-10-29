# Source-warning containment — 1.24.4 · 30 October 2026

Codefe765f5 corrects a regression found during final review of the1.24.3 page-bleed release. The preceding layout work and its measured scope remain documented in PAGE-BLEED-2026-10-30.md.

## Found

`createSpecimen` appends its picture-quality warning to `.specimen-who`, falling back to the metadata's parent. Home had no such group, so moving metadata into optional credit details also moved the generated warning inside closed details. The DOM contained the message, but the rendered interface did not show it. This could conceal the reason a night/flat picture was unsuitable.

## Changed

Home now groups its source information in an unboxed `.home-source-info.specimen-who`. The warning is a sibling of the credit disclosure; only ownership/relay detail stays collapsible. A scoped style lets the complete quality sentence wrap instead of inheriting the phone's old two-line clamp. Global `[hidden]` behavior is preserved. No changes to the shared assessment/source lifecycle; other modules only receive fresh version URLs.

## Verified

Controlled, synthetic inputs were generated in external scratch:640×360 RGB black(0,0,0), flat gray(128,128,128), and a deterministic grayscale block pattern. No private camera or user photo was used, and no training was started.

The dark fixture reproduced the missing painted warning on public1.24.3 with credits closed. On the corrected preview, both dark and flat pictures show complete feedback outside closed credits. A detailed picture clears the message, sets hidden:true, and leaves a zero-sized warning rect rather than reserving empty space.

Nine final captures cover390×844,1024×900,1440×900 in Thai/English/Chinese modes. They explicitly select Picture and return via a stable heading action to scrollY0; no document horizontal overflow, no hidden credit ancestor for the warning, and overflow:visible/no line-clamp. An early native-scroll capture had a transient overscroll offset/automatic Edges state; independent review rejected it, and all nine final captures were regenerated. final-geometry.jsonl and pixel dimensions verify the final states. Independent source and visual review closed this narrow repair with no unresolved finding.

Warnings may legitimately add a few lines after the source choices. No readable feedback, touch target or picture area was removed to force a fixed-height fit. Full credit expansion remains available. This is a containment correction, not a new claim that all translated/status combinations fit one screen.

Evidence: ops/evidence/page-bleed-1.24.4/ (before/after fixtures, all9 final width/language captures, warning-clear negative case and final geometry). Synthetic fixture files/profiles are deleted with the scratch checkout after the task.

## Release / gate repair

Final release38074f5 includes the warning fixfe765f5 and a narrow privacy-gate correction. The first gate passed422/422 tests,27 pages/97 references and94 modules/88 imports, then failed withECONNRESET at the checker’s redundant final index fetch after its synchronous filesystem walk. Nothing was published on that failed attempt.

A controlled6500ms idle pause reproduced the old reset; retaining the exact index response already fetched for CSP checking passes the same pause. The checker now consumes each of its five sampled response bodies and reports the retained index result. All CSP, all-route third-party-script, legal-promise and storage-key checks remain. No retries, ignored errors or privacy relaxation. Independent review approved the repair and read both red/green logs. Temporary probe modules were removed before deployment.

Re-run from clean detached38074f5: npm run deploy green,422/422 tests,27 pages/97 references,94 modules/88 resolved imports,9 declared storage keys,17 required palette pairings and fresh module URLs; Published1.24.4. Normal live API/browser confirm version1.24.4/ok:true. Local/public catalogue loaded20:08:49Z,upstream20:05:52Z,3,252 camera entries, fresh. Runtime package/Home HTML/sharedCSS hash-identical to the release. Public Home warning tested at390/1024/1440 with credits closed, fresh1.24.4 styles, no horizontal overflow; public Learn slider changed16→15, range ends795.3px on390×844, no observed browser error. New Home hue readings are stored separately; prior broad1.24.3 visual/linter scope is not misrepresented as a new full-site audit.

Exact1.24.4 Home hue census:4 purposeful house hues at both1440×900 and390×844. Final live Learn capture and updated before/after comparison are in the1.24.4 evidence folder. The earlier Home headless-linter limitation is retained; no new aggregate linter pass is claimed.
