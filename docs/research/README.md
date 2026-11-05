# Mother77 preprint

This is an author-review preprint and proposed study, not completed participant
research. The owner clarified that Vision is about one month old and its
iterations follow user feedback. Never describe the record as multi-year data
or manufacture participant scores, interview quotes, consent or ethics approval.

Canonical manuscript: `mother77.json`. Source ledger and calculations:
`../../scripts/analyze-mother77.mjs`. Selection is purposive: eight audit
records, one primary theme per document, four historical phone comparisons.
The synthetic model export is a regression fixture, not real-camera accuracy.

Rebuild from the repository root:

```sh
node scripts/analyze-mother77.mjs
PDF_PYTHON=/Users/axiom/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
"$PDF_PYTHON" scripts/build-mother77.py
```

The PDF runtime needs reportlab; `python3` on PATH needs fontTools + brotli for
lossless WOFF2 decompression. Reuses the project's OFL-licensed IBM Plex face;
no font is downloaded. Temporary font conversions live under
`/Volumes/Data/agent-scratch/vision-teach/pdf`, which must be removed afterwards.

Outputs: `public/papers/mother77.pdf`, `mother77.md`, `mother77-data.json`,
and the accessible article partial `public/partials/mother77.html`. Regenerate
the first-page WebP from the latest PDF when the manuscript changes. The reader
uses the exact PDF through local PDF.js; the WebP is only its loading preview.
Inspect every rendered page, check references and source counts, and retain
independent review before publishing a revision. The HTML article is the
accessible, reflowable alternative to the canvas PDF.
