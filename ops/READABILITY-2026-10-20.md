# Reading and multilingual audit · 20 October 2026

Released **1.19.2**, after the already-live 1.19.0 palette was checkpointed separately. User approved applying Research's clearer reading hierarchy across every page.

## Changes

- Shared compact task headings, readable introductory text, Chinese heading leading, wrapping controls. Home's phone title no longer forces two oversized lines.
- Handbook headings select one language instead of showing a long bilingual heading. Inline code wraps; wide tables have a multilingual sideways-scroll cue and keyboard focus. Generated sources remain reproducible.
- Shared navigation boot added to the head. This repairs inert language controls on all twelve handbook routes and Colour; existing page imports reuse the same module URL.
- Chinese lens names and descriptions prevent Home and Cameras from throwing during a language switch. Added regression coverage for all five lenses and three languages.
- Chinese handbook notices inspect the article, so translated navigation cannot conceal an English-only article. Full article translation remains incomplete and is explicitly disclosed.
- Gesture puts its working area before the optional explanation. Drive has a short instruction and an optional explanation, keeps Skip visible, and puts the exercise beside its instructions on desktop.
- Versioned public module dependencies consistently to prevent stale edge-cached copies of language/lens modules.

## Verification

- Full release gate: **316/316 tests**, fonts, generated handbook, 27 routes / 97 local references, 83 modules / 65 imports with no URL forks, privacy/docs/palette checks pass. The final deployment ran the full gate before publication.
- Browser: **27 routes × 3 language modes × 3 widths = 243 checks**, at 390×844, 1024×900 and 1440×900. No document overflow. Earlier detailed measurements also found no clipped headings or controls, and all language switches worked.
- Screenshot collection was corrected after independent review caught stale viewport captures and a wrong language lookup in the replacement capture helper. Final captures assert documentElement language, DOM dimensions and decoded image dimensions after a fresh render. Earlier mislabeled captures are not the evidence used for signoff.
- Independent reviewer approved sampled phone/tablet/desktop layouts and the final Drive two-column composition. No code or reviewed visual blockers remained.
- Public verification: eighteen language/route combinations on Home, Cameras, Colour, handbook chapter 06, Drive and Research; correct release module URL, no overflow, no console errors. Public health reports 1.19.2, fresh catalogue and 23 MB memory at verification.
- Evidence: `ops/evidence/readability-1.19.2/`; live desktop Drive and Chinese phone handbook screenshots, layout records, public checks and lint output. Full local screenshots and gate logs remain under `/tmp/vision-readability-2026-10-20/`.

## Lint interpretation and limits

Automated lint is not reported as universally green. Home, Gesture, Research and handbook 06 score REVIEW (3–4 points). Initial Drive scored SLOP (7): review found a real unused desktop half, repaired by the side-by-side exercise. Final Drive scores REVIEW (5), basics PASS, with no dark-command-centre flag. Functional Unicode symbols and the established Plex font trigger known flags. Flat reading/instrument grounds and a long-line warning remain for manual judgment; the 46.2em Drive warning was not attributed to a specific prose element, so is not claimed to be a proven diagram false positive. Independent review accepted the final composition.

This verifies reading layout, language controls and the scoped fixes. It does not certify complete Chinese translation, all possible device sizes, or the quality/availability of externally owned cameras.
