import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * /research — the composition of the page, not its content.
 *
 * This page described the field well and drew it badly. Six catalogue numbers in
 * one row at display size, so 3,425 cameras and 7 agencies shouted equally.
 * Four solid black buttons to choose a year, each far bigger than the words in
 * it. A row of "choose where to start" buttons, each sized to its own text,
 * staircasing down the page-head. Every one of them is the same failure — equal
 * weight, so nothing wins — and none of it is visible from the stylesheet alone.
 *
 * These pin the decisions, not the taste. Each was mutation-checked: put the
 * boxes back, and the test that should fail does.
 */

const html = readFileSync(new URL('../public/research.html', import.meta.url), 'utf8')
const css = readFileSync(new URL('../public/css/pages/research.css', import.meta.url), 'utf8')
const js = readFileSync(new URL('../public/js/pages/research.js', import.meta.url), 'utf8')

/** The declaration block of one rule, by exact selector. */
const ruleBody = (selector, source = css) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^[ \\t]*${esc}[ \\t]*\\{([^}]*)\\}`, 'm').exec(source)?.[1] ?? null
}
/** What a rule's `background` actually is — '' when it declares none. */
const fill = (body) => (/(?:^|;)\s*background\s*:\s*([^;]*)/.exec(body ?? '')?.[1] ?? '').trim()
const size = (body) => /(?:^|;)\s*font-size\s*:\s*([^;]*)/.exec(body ?? '')?.[1]?.trim()

test('the visual lesson precedes the optional catalogue and about section', () => {
  assert.ok(html.indexOf('id="history-lab"') < html.indexOf('class="research-about"'))
  const about = /<details class="research-about">[\s\S]*?<\/details>/.exec(html)?.[0] ?? ''
  assert.match(about, /id="about"/)
  assert.match(about, /data-evidence-status/)
  assert.equal((about.match(/data-fig=/g) ?? []).length, 6, 'all real catalogue facts remain available')
  assert.doesNotMatch(about.split('>')[0], /\bopen\b/, 'catalogue details must not take over the opening')
})

test('the opening has a single heading and optional readable contents', () => {
  const opening = /<header class="research-opening">[\s\S]*?<\/header>/.exec(html)?.[0] ?? ''
  assert.equal((opening.match(/<h1>/g) ?? []).length, 1)
  assert.match(opening, /<details class="research-contents">/)
  for (const destination of ['#history-lab', '#learning-kinds', '#nt-tag-id', '#by-hand', '/handbook/reading#build-with-open-tools']) {
    assert.ok(opening.includes('href="' + destination + '"'), destination + ' is no longer reachable')
  }
  assert.doesNotMatch(opening, /class="btn|data-fig=/, 'the opening has become a button or statistic grid again')
})

test('the four landmarks are marks on one axis, not four boxes', () => {
  const marks = html.match(/<button[^>]*data-history-choice[^>]*>/g) ?? []
  assert.equal(marks.length, 4, 'expected four landmarks')
  for (const m of marks) {
    assert.match(m, /class="axis-mark"/, 'a landmark is a button again')
    assert.doesNotMatch(m, /class="btn/, 'a landmark is a filled field again')
  }

  const body = ruleBody('.axis-mark')
  assert.ok(body, 'the mark rule is gone')
  assert.ok(['', 'transparent'].includes(fill(body)), `a landmark is a filled field again: background: ${fill(body)}`)
  // The axis itself: one edge per mark, welding into a single rule.
  assert.match(body, /border-top:\s*3px solid var\(--text\)/, 'the marks no longer form a line')

  // And the chosen year is the one filled thing, which is the only way the eye
  // is told where it is.
  assert.match(ruleBody('.axis-mark[aria-pressed="true"] .num') ?? '', /background:\s*var\(--text\)/)
  assert.match(ruleBody('.axis-mark[aria-pressed="true"] .num') ?? '', /color:\s*var\(--ground\)/)
})

test('each year keeps its descriptive name for assistive technology', () => {
  const marks = html.match(/<button[^>]*data-history-choice[\s\S]*?<\/button>/g) ?? []
  assert.equal(marks.length, 4)
  for (const mark of marks) {
    assert.match(mark, /lang="th"/)
    assert.match(mark, /lang="en"/)
    assert.match(mark, /aria-controls="history-/)
  }
})

test('one way in is a field and the rest are words, in both places that offer a way in', () => {
  // Each panel: try the lesson (a field) or read the paper (a word).
  for (const panel of html.match(/<div class="controls">[\s\S]*?<\/div>/g) ?? []) {
    if (!panel.includes('history') && !panel.includes('Original research') && !panel.includes('ต้นฉบับงานวิจัย')) continue
    assert.equal((panel.match(/btn primary/g) ?? []).length, 1, 'a panel offers more than one field')
  }

  // …and both are actually words in the stylesheet, not just unmarked in the HTML.
  assert.match(ruleBody('.history-panel .controls .btn:not(.primary)') ?? '', /background:\s*transparent/)
})

test('the landmark chooser still degrades to four readable panels without JavaScript', () => {
  // The chooser is JS-only. If it were the only thing showing the four years,
  // a reader with no script would get none of them.
  assert.match(html, /class="history-choices" hidden/, 'the chooser is no longer hidden by default')
  const panels = html.match(/<article class="history-panel"[^>]*>/g) ?? []
  assert.equal(panels.length, 4, 'expected four panels')
  for (const p of panels) assert.doesNotMatch(p, /hidden/, 'a panel ships hidden and needs JS to appear')
  assert.match(js, /\.history-choices'\)\.hidden = false/, 'the script no longer reveals the chooser')
})