# PDF.js 6.5.438

Mozilla PDF.js, distributed as `pdfjs-dist@6.5.438` through npm.
Only the official minified browser API, matching worker and Apache-2.0 LICENSE
are retained. The reader loads these locally only when Research's paper opens.

Upstream: https://mozilla.github.io/pdf.js/
Package: https://www.npmjs.com/package/pdfjs-dist/v/6.5.438
Tarball SHA-1 reported by npm: e7f8986ec4ea04057b5d9d2f0e5b63ea94d2303f

No upstream code modifications. Rendering disables eval, document font faces,
WASM and remote assets; all PDF glyphs come from its embedded fonts as paths.
The project exposes no PDF document scripts, attachments or interactive actions.
