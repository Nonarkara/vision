import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SCREEN_FLOOR, VEIL, HUES } from '../public/js/core/palette.js'

// THE COLOUR LAW, held in the stylesheet where it is made.
//
// The law: every room's first screen carries at least three of the four house
// hues, each at a size a reader can see — SCREEN_FLOOR, half a per cent of
// the screen — and each doing its own job.
//
//   ivory  the paper   ·  indigo the words   ·  gray the quiet   ·  jasper the signal
//
// The census that measures it is a browser instrument and lives with the other
// browser instruments; it is run by hand before a release, the way the linter
// is. What the repository holds is the declarations themselves, so a change
// that undoes the law fails here rather than waiting for the next census.
//
// Every pin below was proved by injection: the declaration was changed, the
// pin failed, and the declaration was put back. The tree is byte-identical to
// the tree the pins were proved on.

const visionCss = readFileSync(new URL('../public/css/vision.css', import.meta.url), 'utf8')
const colourCss = readFileSync(new URL('../public/css/pages/colour.css', import.meta.url), 'utf8')
const camerasCss = readFileSync(new URL('../public/css/pages/cameras.css', import.meta.url), 'utf8')
const storyCss = readFileSync(new URL('../public/css/pages/story.css', import.meta.url), 'utf8')
const colourHtml = readFileSync(new URL('../public/colour.html', import.meta.url), 'utf8')
const practiceVideo = readFileSync(new URL('../public/js/train/practice-video.js', import.meta.url), 'utf8')

/**
 * The source with every @media and @container block removed.
 *
 * A conditional rule is the same selector with a different value, and a pin
 * that reads the LAST match would read the phone's value and call it the
 * desktop's. The pins below are about the declarations the desktop and the
 * phone share, so the conditional ones are taken out before the search.
 */
function stripConditional(source) {
  let out = ''
  let i = 0
  while (i < source.length) {
    const m = /@(media|container)\b/.exec(source.slice(i))
    if (!m) { out += source.slice(i); break }
    out += source.slice(i, i + m.index)
    let j = source.indexOf('{', i + m.index)
    let depth = 0
    for (; j < source.length; j++) {
      if (source[j] === '{') depth++
      else if (source[j] === '}') { depth--; if (depth === 0) break }
    }
    i = j + 1
  }
  return out
}

/** The declarations of the last rule whose prelude names exactly `selector`. */
function lastRule(selector, source) {
  const re = /([^{}]+)\{([^}]*)\}/g
  let found = null
  let m
  while ((m = re.exec(stripConditional(source)))) {
    const preludes = m[1].replace(/\/\*[\s\S]*?\*\//g, '').split(',').map((s) => s.trim())
    if (preludes.includes(selector)) found = m[2]
  }
  return found || ''
}

/** The declarations of the last rule whose prelude names every one of `parts`. */
function lastRuleWith(parts, source) {
  const re = /([^{}]+)\{([^}]*)\}/g
  let found = null
  let m
  while ((m = re.exec(stripConditional(source)))) {
    const preludes = m[1].replace(/\/\*[\s\S]*?\*\//g, '').split(',').map((s) => s.trim())
    if (parts.every((p) => preludes.includes(p))) found = m[2]
  }
  return found || ''
}

// ── The floor ────────────────────────────────────────────────────────────────

test('the floor of the law is one number, and it is half a per cent', () => {
  assert.equal(SCREEN_FLOOR, 0.5)
  // The house's own hairlines measure 0.01%–0.15% of a screen. The floor has
  // to stand clear of those, or a hairline would pass for a hue.
  assert.ok(SCREEN_FLOOR > 0.15, 'a floor under the hairlines would count a rule as a colour')
})

// ── The quiet hue: the parts nobody is meant to read first ───────────────────

test("the instrument's frame is the quiet hue, not the hardware's black", () => {
  const view = lastRule('.bench-view', visionCss)
  assert.match(view, /background:\s*var\(--quiet\)/, 'the frame around the picture is the quiet hue')
  assert.doesNotMatch(view, /var\(--black\)/, 'black is the hardware, and 1.03:1 from the ink')
})

test("the instrument's state and counters are quiet chips, and the row stays the housing", () => {
  // The quiet hue went on the whole label row first, and that was wrong twice
  // over: the row's links and the owner's name are white on black and would
  // have been 1.7:1 on a grey field, and a full-width grey bar holding one
  // short label is a stretched bar — the linter's stretch-to-fill caught it on
  // /games. So the quiet hue sits on the ITEMS: the machine's state and the
  // machine's counters, which are what the house calls quiet, worn as chips
  // the way the More menu's path steps already wear them.
  const row = lastRule('.bench-caption', visionCss)
  assert.doesNotMatch(row, /background:\s*var\(--quiet\)/, 'the row is the instrument\'s housing, not a quiet bar')
  assert.doesNotMatch(row, /color:\s*var\(--quiet-text\)/, 'the row\'s own text stays light on black')
  const chips = lastRuleWith(['.bench-caption > .label', '.bench-caption > .num'], visionCss)
  assert.match(chips, /background:\s*var\(--quiet\)/, 'the state and the counters are quiet chips')
  assert.match(chips, /color:\s*var\(--quiet-text\)/, 'ink on the quiet field is 9.87:1')
})

test('a step marker is the quiet hue, and a step the machine confirmed still answers in the signal', () => {
  const marker = lastRule('.manual-n', visionCss)
  assert.match(marker, /background:\s*var\(--quiet\)/, 'a number nobody reads first is the quiet hue')
  assert.match(marker, /color:\s*var\(--quiet-text\)/)
  const done = lastRule('.manual li[data-done] .manual-n', visionCss)
  assert.match(done, /background:\s*var\(--jasper\)/, 'a confirmed step is the machine finding something')
})

test('the chapter number in an index is the quiet hue', () => {
  const num = lastRule('.index .num', visionCss)
  assert.match(num, /background:\s*var\(--quiet\)/)
  assert.match(num, /color:\s*var\(--quiet-text\)/)
})

test('the colour study plate sits on the quiet mount, so a dealt ground can never vanish into the page', () => {
  const frame = lastRule('.plate-frame', colourCss)
  assert.match(frame, /background:\s*var\(--quiet\)/, 'the mount is the instrument frame, like the bench view')
})

test("the practice clip's letterbox is the quiet hue, read from the palette", () => {
  assert.match(practiceVideo, /fillStyle\s*=\s*HUES\.gray/, 'the frame round the picture is the quiet hue')
  assert.doesNotMatch(practiceVideo, /#051230/, 'no second hex here: the palette is the only place a hue is written')
  assert.match(practiceVideo, /from '\.\.\/core\/palette\.js\?v=/, 'and it is read from the certified palette')
})

test("the instrument's state message stands on the quiet field, in the ink that goes on it", () => {
  // The state is the instrument saying it has nothing yet. It stands on the
  // view's quiet field, so it is the quiet field with the ink that goes on it
  // — the same pairing the caption row uses, in the same rule, because that
  // is what --quiet-text is for. It was grey ink: legible on the black frame
  // the view used to be, and 1.6:1 on the grey it became.
  const state = lastRule('.bench-state', visionCss)
  assert.match(state, /background:\s*var\(--quiet\)/)
  assert.match(state, /color:\s*var\(--quiet-text\)/)
})

test('the map keeps its own ground, and the state over it keeps the light ink', () => {
  const map = lastRule('.map-view .bench-state', camerasCss)
  assert.match(map, /background:\s*transparent/, 'a grey panel over the map would cover the map')
  assert.match(map, /color:\s*var\(--gray\)/, 'light ink on the map\'s black ground')
})

// ── The signal hue: what the machine sees, and only that ────────────────────

test('the recording chip is the signal hue, with the words in the certified pairing', () => {
  const rec = lastRule('.rec', storyCss)
  assert.match(rec, /background:\s*var\(--jasper\)/, 'the machine is watching: that is the signal hue')
  assert.match(rec, /color:\s*var\(--black\)/, 'black on jasper is 5.25:1 and the certificate knows it')
  const dot = lastRule('.rec-dot', storyCss)
  assert.match(dot, /color:\s*var\(--black\)/, 'the light itself is the hole in the signal field')
})

// ── The story: the house's own paper on the house's own ground ───────────────

test('the story veil is the house ink, and it is the veil the certificate measured', () => {
  const veil = lastRule('.hero-veil', storyCss)
  const declared = /background:\s*rgba\(([^)]+)\)/.exec(veil)
  assert.ok(declared, 'the veil must be a declared colour, not a picture of one')
  const [r, g, b, a] = declared[1].split(',').map((s) => s.trim())
  assert.equal(`#${[r, g, b].map((v) => Number(v).toString(16).padStart(2, '0')).join('')}`, HUES.indigo,
    'the type ground is the ink, and the ink is what the certificate measures')
  assert.equal(Number(a), 0.7, '70% is the alpha the contrast was measured at')
  assert.equal(veil.includes(VEIL.css), true, 'the stylesheet and the certificate must name the same veil')
})

test('the story headline is the house paper, not the hardware white', () => {
  const h1 = lastRule('.hero h1', storyCss)
  assert.match(h1, /color:\s*var\(--ivory\)/, 'ivory on the veil is 4.80:1, the floor is 4.5:1')
  const lede = lastRule('.hero-lede', storyCss)
  assert.match(lede, /color:\s*var\(--ivory\)/)
})

// ── The colour study's own structure ────────────────────────────────────────

/** The index of the tag that closes the element opened at `open`. */
function closeOf(html, open) {
  let depth = 0
  const re = /<(\/?)div\b/g
  re.lastIndex = open
  let m
  while ((m = re.exec(html))) {
    if (m[1] === '') depth++
    else { depth--; if (depth === 0) return m.index }
  }
  return -1
}

test('the colour study keeps its manual inside the body it belongs to', () => {
  // The manual used to be a direct child of .chapter. The chapter grid has two
  // columns, so the manual took the wide one and the body — the buttons, the
  // plate, the machine's reading, the words — was pushed into the narrow
  // header column at 305px, and the plate's own sentence came out eight
  // characters to a line. Every other room puts its manual inside the body.
  const body = colourHtml.indexOf('<div class="chapter-body study">')
  assert.ok(body > 0, 'the study body must exist')
  const instructions = colourHtml.indexOf('<div class="study-instructions">')
  assert.ok(instructions > body, 'the instruction column must open inside the study body')
  const manual = colourHtml.indexOf('<ol class="manual"')
  assert.ok(manual > instructions, 'the manual must open inside the instruction column')
  assert.ok(closeOf(colourHtml, instructions) > manual, 'the manual must close inside the instruction column, not after it')
})

test('the study body is two columns, and the human answer sits with the instruction', () => {
  const body = lastRule('.chapter-body.study', colourCss)
  assert.match(body, /grid-template-columns:\s*minmax\(0,\s*0\.85fr\)\s+minmax\(0,\s*1\.15fr\)/,
    'the body must split the plate away from the instruction')
  // The manual is a house component and no page stylesheet may name it, so the
  // study's own layout is held by two wrappers instead of by grid-area rules
  // on .manual.
  assert.doesNotMatch(colourCss, /\.manual\s*\{/, 'a page stylesheet must not re-declare the house component')
  const instructions = lastRule('.study-instructions', colourCss)
  assert.match(instructions, /display:\s*grid/, 'the instruction column is its own stack')
})

// ── The law itself ───────────────────────────────────────────────────────────

test('the law is written where the palette lives, with the photograph clause in it', () => {
  const palette = readFileSync(new URL('../public/js/core/palette.js', import.meta.url), 'utf8')
  assert.match(palette, /THREE HUES ON A SCREEN/, 'the law must be stated with the colours it measures')
  assert.match(palette, /PHOTOGRAPH CLAUSE/, 'a photograph\'s colours are the world\'s, and the rule must say so')
})
