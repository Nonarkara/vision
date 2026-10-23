// Two claims the site now makes to a reader, and the evidence for them:
//
//   1 · "Where am I on the path?" — four rooms carry a four-step rail, and each
//       marks its own step in the markup rather than only in colour.
//   2 · "This page is not in your language" — a Chinese reader is told, in
//       Chinese, when the room has no Chinese instead of being handed English
//       without a word of explanation.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assemblePage, PAGES } from '../server/http.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const partials = Object.fromEntries(
  ['nav', 'head', 'foot', 'path'].map((n) => [n, read(`public/partials/${n}.html`)]),
)
const assemble = (page, route) => assemblePage(read(`public/${page}.html`), { partials, page, version: '1.17.1', route })

const STEPS = ['begin', 'look', 'teach', 'judge']

test('the path is four steps, in order, each naming where it goes', () => {
  const rail = partials.path
  const found = [...rail.matchAll(/data-step="([a-z]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]])
  assert.deepEqual(found.map(([s]) => s), STEPS)
  assert.deepEqual(found.map(([, href]) => href), ['/learn', '/cameras', '/train', '/games'])
})

test('each step says what it is, in Thai, English and Chinese', () => {
  for (const step of STEPS) {
    const line = partials.path.split('\n').find((l) => l.includes(`data-step="${step}"`))
    for (const cls of ['th', 'en', 'zh']) assert.match(line, new RegExp(`class="${cls}"`), `${step} has no ${cls} line`)
  }
})

test('every room of the path shows the rail', () => {
  for (const page of ['learn', 'cameras', 'train', 'games']) {
    assert.match(read(`public/${page}.html`), /<!--#path-->/, `${page} does not carry the learning path`)
  }
})

test('a room marks its own step, so "where am I" is answered by the markup', () => {
  for (const [route, page, step] of [['/learn', 'learn', 'begin'], ['/cameras', 'cameras', 'look'], ['/train', 'train', 'teach'], ['/games', 'games', 'judge']]) {
    const html = assemble(page, route)
    const marked = [...html.matchAll(/data-step="([a-z]+)"( aria-current="step")?/g)]
      .filter((m) => m[2]).map((m) => m[1])
    assert.deepEqual(marked, [step], `${route} should mark exactly its own step`)
  }
})

test('a room off the path marks no step at all', () => {
  // /colour has no learning path, so it must not claim to be standing on one.
  assert.doesNotMatch(assemble('colour', '/colour'), /aria-current="step"/)
})

test('the rail marks a step, and the page itself is still marked once', () => {
  const html = assemble('learn', '/learn')
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1)
  assert.equal((html.match(/aria-current="step"/g) ?? []).length, 1)
})

test('every room that carries the rail is a real, reachable page', () => {
  for (const [, href] of [...partials.path.matchAll(/data-step="[a-z]+" href="([^"]+)"/g)]) {
    assert.ok(href in PAGES, `${href} is on the learning path but is not a route`)
  }
})

// ── The language note ───────────────────────────────────────────────────

/** Span counts as the page's own i18n counts them: by language class. */
function spanCounts(html) {
  const prose = html.replace(/<svg[\s\S]*?<\/svg>/g, '')
  const of = (c) => (prose.match(new RegExp(`class="[^"]*\\b${c}\\b[^"]*"`, 'g')) ?? []).length
  return { th: of('th'), en: of('en'), zh: of('zh') }
}

test('only one room is finished in Chinese, and the rest are honest about it', () => {
  // The note is shown when a page has under half as many Chinese lines as
  // Thai ones. These counts are the evidence that line sits where it must:
  // a finished room clears it by a mile, an unfinished one is nowhere near.
  const finished = spanCounts(read('public/reconstruct.html'))
  assert.ok(finished.zh >= finished.th / 2, 'a finished room must not be mistaken for an unfinished one')
  for (const page of ['learn', 'train', 'cameras', 'games', 'colour']) {
    const counts = spanCounts(read(`public/${page}.html`))
    assert.ok(counts.zh < counts.th / 2, `${page} looks translated enough to hide the note`)
  }
})

test('the Chinese line the note shows is about the page, not about the site', () => {
  const note = read('public/js/core/i18n.js').match(/innerHTML = '(<span lang="zh-Hans">[^']+)'/)
  assert.ok(note, 'the note must be written in Chinese — it is shown to a Chinese reader')
  assert.match(note[1], /中文/)
})

test('a room with no Chinese keeps its English rather than going blank', () => {
  // The note explains the fallback; it does not replace the page. This is the
  // rule the CSS already enforces (`.en:has(+ .zh)`), restated as a test so
  // nobody "fixes" a blank page by hiding English instead of saying so.
  const css = read('public/css/vision.css')
  assert.match(css, /html\[data-lang="zh"\] \.en:has\(\+ \.zh\)/)
})
test('the four-step path lives inside room navigation, without a second page band', () => {
  for (const [route, page] of [['/learn', 'learn'], ['/cameras', 'cameras'], ['/train', 'train'], ['/games', 'games']]) {
    const html = assemble(page, route)
    const end = html.indexOf('</header>')
    const header = html.slice(0, end)
    assert.match(header, /class="path"/, `${route}: the path must stay reachable in navigation`)
    assert.doesNotMatch(html.slice(end), /class="path"/, `${route}: no duplicate path band`)
    assert.equal((header.match(/data-step="/g) ?? []).length, 4)
    assert.match(header, /aria-controls="rooms-nav"/)
  }
})

test('off-path rooms do not inherit a path or leave an unresolved nav slot', () => {
  const html = assemble('colour', '/colour')
  assert.doesNotMatch(html, /class="path"|class="path-title"|<!--#learningpath-->/)
})
